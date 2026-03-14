'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getAlbums() {
  return await prisma.album.findMany({
    include: {
      photos: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function createAlbum(title) {
  const album = await prisma.album.create({
    data: {
      title,
    }
  })
  revalidatePath('/')
  return album
}

export async function deleteAlbum(id) {
  await prisma.album.delete({
    where: { id }
  })
  revalidatePath('/')
}

export async function getPhotos(albumId) {
  if (albumId === 'all') {
    return await prisma.photo.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
  return await prisma.photo.findMany({
    where: { albumId },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function addPhoto(data) {
  const { url, title, albumId } = data
  const photo = await prisma.photo.create({
    data: {
      url,
      title,
      albumId
    }
  })
  revalidatePath('/')
  return photo
}

export async function deletePhoto(id) {
  await prisma.photo.delete({
    where: { id }
  })
  revalidatePath('/')
}
